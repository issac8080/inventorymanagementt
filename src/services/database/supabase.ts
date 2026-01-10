import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log environment variables (remove in production)
if (import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrl ? '✅ Loaded' : '❌ Missing');
  console.log('Supabase Key:', supabaseAnonKey ? '✅ Loaded' : '❌ Missing');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Make sure .env.local exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  console.error('Current values:', { supabaseUrl, supabaseAnonKey });
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

