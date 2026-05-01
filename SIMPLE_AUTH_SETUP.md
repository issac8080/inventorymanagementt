# Simple mobile auth (Firestore)

## What’s implemented

1. **Accounts** — Mobile + password stored in Firestore collection `app_users` (plaintext passwords, dev-style; tighten for production).
2. **Admin** — Optional operator login via `VITE_ADMIN_USERNAME` / `VITE_ADMIN_PASSWORD` (see `.env.example`).
3. **User isolation** — Products and warranty docs use `userMobile` on each document.

## Firebase steps

1. Enable **Firestore** and publish **`firestore.rules`** from this repo (see `SETUP.md`).
2. Fill **`VITE_FIREBASE_*`** in `.env` from the Firebase console web app config.
3. Restart **`npm run dev`**.

## Test

1. **Sign up** — 10+ digit mobile, password ≥ 4 characters.
2. **Admin** — If env admin vars are set, log in with that username/password → `/admin`.

## Troubleshooting

- **“Firebase is not configured”** — Add the three required `VITE_FIREBASE_*` values and restart Vite.
- **Permission errors** — Deploy `firestore.rules` in Firebase Console.
