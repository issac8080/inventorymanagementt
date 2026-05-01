import type { AppUser } from '@/types/appUser';
import { normalizeLoginId } from './builtinAccounts';
import { assertValidSignupContact, parseContactForAuth, type ParsedContact } from './identifierAuth';

const STORAGE_KEY = 'initra_managed_users_v1';

export interface ManagedUserRow {
  id: string;
  loginId: string;
  password: string;
  username: string;
  created_at: string;
}

function read(): ManagedUserRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ManagedUserRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(rows: ManagedUserRow[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function rowKeyMatches(rowLoginId: string, parsed: ParsedContact): boolean {
  return normalizeLoginId(rowLoginId) === normalizeLoginId(parsed.loginKey);
}

export function getLocalManagedUsers(): AppUser[] {
  return read().map((r) => ({
    id: r.id,
    mobile: r.loginId,
    password: r.password,
    username: r.username,
    created_at: r.created_at,
  }));
}

export function findLocalManagedLogin(rawLogin: string, password: string): AppUser | null {
  let parsed: ParsedContact;
  try {
    parsed = parseContactForAuth(rawLogin);
  } catch {
    return null;
  }
  const row = read().find((r) => rowKeyMatches(r.loginId, parsed) && r.password === password);
  if (!row) return null;
  return {
    id: row.id,
    mobile: row.loginId,
    password: row.password,
    username: row.username,
    created_at: row.created_at,
  };
}

export function addLocalManagedUser(
  loginIdRaw: string,
  password: string,
  displayName: string
): AppUser {
  const parsed = assertValidSignupContact(loginIdRaw);
  const lid = parsed.loginKey;

  const rows = read();
  if (rows.some((r) => rowKeyMatches(r.loginId, parsed))) {
    throw new Error('This email, phone, or username is already taken.');
  }

  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const row: ManagedUserRow = {
    id,
    loginId: lid,
    password,
    username: displayName || lid,
    created_at,
  };
  rows.push(row);
  write(rows);
  return {
    id,
    mobile: lid,
    password,
    username: row.username,
    created_at,
  };
}

export function deleteLocalManagedUser(id: string): void {
  const rows = read().filter((r) => r.id !== id);
  write(rows);
}
