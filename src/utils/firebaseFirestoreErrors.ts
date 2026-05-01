/**
 * Maps Firebase / Firestore errors to actionable copy for login & signup.
 * Firestore SDK uses codes like `permission-denied` or `firestore/permission-denied`.
 */
export function getFirestoreUserMessage(error: unknown): string | null {
  if (error == null) return null;

  let code = '';
  let message = '';

  if (typeof error === 'object') {
    const e = error as { code?: unknown; message?: unknown };
    if (e.code != null) code = String(e.code);
    if (e.message != null) message = String(e.message);
  } else if (typeof error === 'string') {
    message = error;
  }

  const combined = `${code} ${message}`.toLowerCase();

  if (
    combined.includes('permission') ||
    combined.includes('insufficient permission') ||
    combined.includes('missing or insufficient permissions')
  ) {
    return (
      'Firestore blocked this request (permission denied). In Firebase Console go to Firestore → Rules and publish ' +
      'rules that allow access (see firestore.rules in this project), or run: firebase deploy --only firestore:rules'
    );
  }

  if (combined.includes('unavailable') || combined.includes('failed-precondition')) {
    return (
      'Firestore is not ready. In Firebase Console, create a Firestore database (Native mode) in the same project as your web app.'
    );
  }

  if (combined.includes('not-found') && combined.includes('database')) {
    return 'Firestore database not found. Create it in Firebase Console → Firestore → Create database.';
  }

  if (
    combined.includes('auth/configuration-not-found') ||
    combined.includes('configuration-not-found')
  ) {
    return (
      'Firebase sign-in is not enabled for this project. In Firebase Console → Authentication → Get started, ' +
      'then Sign-in method → enable Email/Password. Ensure your VITE_FIREBASE_* values are from the same project ' +
      '(Project settings → Your apps → Web app). If you only want local data, use “this device only” on the login screen. ' +
      'Alternatively, use Supabase: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example) and run supabase-schema.sql.'
    );
  }

  if (
    combined.includes('invalid login credentials') ||
    combined.includes('invalid_grant') ||
    combined.includes('email not confirmed')
  ) {
    return 'Invalid email, phone, or password. If you use Supabase, confirm your email or disable “Confirm email” for testing.';
  }

  if (
    combined.includes('auth/invalid-credential') ||
    combined.includes('auth/wrong-password') ||
    combined.includes('auth/user-not-found') ||
    combined.includes('auth/invalid-email')
  ) {
    return 'Invalid email, phone, or password.';
  }

  if (combined.includes('auth/email-already-in-use')) {
    return 'This email or phone is already registered. Try signing in instead.';
  }

  if (combined.includes('auth/weak-password')) {
    return 'Password is too weak. Use at least 6 characters.';
  }

  return null;
}
