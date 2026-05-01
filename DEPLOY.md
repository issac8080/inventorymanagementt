# Quick deploy (Vercel / Netlify / static)

1. **Build:** `npm run build` → output folder **`dist/**`.
2. **Upload / connect:** Point the host at **`dist`** (Vercel: import repo, framework **Vite**, output **dist** — `vercel.json` is already in the repo).
3. **No Firebase yet:** The login screen shows **“Start using the app (this device — no account)”** so the public URL works with **zero env vars** (data stays in the browser).
4. **Cloud login:** In the host’s **Environment Variables**, add `VITE_FIREBASE_*` from `.env.example`. Enable **Authentication → Email/Password** in Firebase Console. Create the first operator: add a user in Authentication, then in Firestore create `app_users/{thatUserUid}` with `{ loginKey: "theirusername", username: "...", created_at: "<iso>", isAdmin: true }`. Deploy **`firestore.rules`** and **`storage.rules`** (Storage bucket required for warranty photos). Composite indexes: deploy **`firestore.indexes.json`** or create indexes when the Console prompts from an error link.
5. **SPA routing:** `vercel.json` rewrites are set. **Netlify:** `public/_redirects` is copied into **`dist/_redirects`** on build.
