/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Next.js-style names (supported when set in `.env`; requires `envPrefix` in vite.config). */
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  /** Optional. If unset, admin login is disabled (recommended for public builds). */
  readonly VITE_ADMIN_USERNAME?: string;
  /** Optional. Must be set with VITE_ADMIN_USERNAME to enable admin login. */
  readonly VITE_ADMIN_PASSWORD?: string;
  readonly VITE_BUILTIN_USER_USERNAME?: string;
  readonly VITE_BUILTIN_USER_PASSWORD?: string;
  readonly VITE_DISABLE_FIREBASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
