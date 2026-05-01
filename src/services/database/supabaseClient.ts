import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonOrPublishableKey, getSupabaseUrl, isSupabaseConfigured } from './cloudEnv';

let client: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }
  if (!client) {
    const url = getSupabaseUrl()!;
    const key = getSupabaseAnonOrPublishableKey()!;
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
