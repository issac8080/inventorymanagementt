function envTrim(key: keyof ImportMetaEnv): string {
  const v = import.meta.env[key] as string | undefined;
  return typeof v === 'string' ? v.trim() : '';
}

/** Local-only operator login; override with `VITE_ADMIN_USERNAME` / `VITE_ADMIN_PASSWORD`. */
export const BUILTIN_ADMIN_LOGIN = envTrim('VITE_ADMIN_USERNAME') || 'admin';
export const BUILTIN_ADMIN_PASSWORD = envTrim('VITE_ADMIN_PASSWORD') || 'admin';

/** Local-only default user; optional env overrides for demos. */
export const BUILTIN_USER_LOGIN = envTrim('VITE_BUILTIN_USER_USERNAME') || 'issac';
export const BUILTIN_USER_PASSWORD = envTrim('VITE_BUILTIN_USER_PASSWORD') || 'issac';

export function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase();
}

const RESERVED = new Set([
  normalizeLoginId(BUILTIN_ADMIN_LOGIN),
  normalizeLoginId(BUILTIN_USER_LOGIN),
]);

export function isReservedLoginId(loginId: string): boolean {
  return RESERVED.has(normalizeLoginId(loginId));
}

export function isValidNewLoginId(raw: string): boolean {
  const s = normalizeLoginId(raw);
  if (s.length < 2 || s.length > 32) return false;
  return /^[a-z0-9][a-z0-9._-]*$/.test(s);
}
