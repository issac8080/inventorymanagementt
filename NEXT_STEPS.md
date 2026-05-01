# Next steps

1. **Firebase** — Follow `SETUP.md`: enable Firestore, copy `.env.example` → `.env`, add web app keys, publish `firestore.rules`.
2. **Run the app** — `npm run dev`, sign up with a mobile number, or use **Continue on this device only** for IndexedDB-only mode.
3. **Production** — Tighten `firestore.rules` (avoid `allow read, write: if true`); consider Firebase Authentication instead of plaintext passwords in `app_users`.
