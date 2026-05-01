import { getSupabaseBrowserClient } from '../database/supabaseClient';
import type { AppUser } from '@/types/appUser';

export async function supabaseFetchProfile(userId: string): Promise<AppUser | null> {
  const sb = getSupabaseBrowserClient();
  const { data, error } = await sb
    .from('profiles')
    .select('id, login_key, username, is_admin, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    mobile: data.login_key as string,
    password: '',
    username: (data.username as string) || (data.login_key as string),
    created_at: (data.created_at as string) || new Date().toISOString(),
    isAdmin: data.is_admin === true,
  };
}

export async function supabaseListProfiles(): Promise<AppUser[]> {
  const sb = getSupabaseBrowserClient();
  const { data, error } = await sb
    .from('profiles')
    .select('id, login_key, username, is_admin, created_at')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id as string,
    mobile: row.login_key as string,
    password: '',
    username: (row.username as string) || (row.login_key as string),
    created_at: (row.created_at as string) || new Date().toISOString(),
    isAdmin: row.is_admin === true,
  }));
}

export async function supabaseDeleteProfileRow(userId: string): Promise<void> {
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}

export type SupabaseSessionPayload = { user: AppUser; isAdmin: boolean } | null;

export function supabaseInitAuthSync(onApply: (payload: SupabaseSessionPayload) => void): () => void {
  const sb = getSupabaseBrowserClient();
  const { data } = sb.auth.onAuthStateChange(async (_event, session) => {
    try {
      if (!session?.user?.id) {
        onApply(null);
        return;
      }
      const profile = await supabaseFetchProfile(session.user.id);
      const mobile = profile?.mobile ?? '';
      if (!profile || !mobile) {
        await sb.auth.signOut().catch(() => {});
        onApply(null);
        return;
      }
      onApply({
        user: {
          id: session.user.id,
          mobile,
          password: '',
          username: profile.username,
          created_at: profile.created_at,
          isAdmin: profile.isAdmin,
        },
        isAdmin: profile.isAdmin === true,
      });
    } catch (e) {
      console.error('Supabase auth sync error:', e);
      onApply(null);
    }
  });
  return () => data.subscription.unsubscribe();
}
