import { normalizeLoginId } from './builtinAccounts';
import { getFirebaseConfig } from '../database/firebaseEnv';

/**
 * Firebase Email/Password provider requires an email-shaped identifier.
 * We map login usernames to a stable synthetic address under the project's auth domain.
 */
export function loginKeyToAuthEmail(loginKey: string): string {
  const { projectId } = getFirebaseConfig();
  const pid = String(projectId ?? 'app').replace(/[^a-z0-9-]/gi, '');
  const raw = normalizeLoginId(loginKey);
  const local = raw.replace(/[^a-z0-9._-]/g, '_').slice(0, 64) || 'user';
  return `${local}@${pid}.firebaseapp.com`;
}
