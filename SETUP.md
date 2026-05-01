# Setup Guide — Firebase (Firestore)

This app uses **Firebase Firestore** for cloud login and data. Without Firebase env vars, use **Continue on this device only** on the login screen (IndexedDB).

## Prerequisites

- A [Firebase](https://firebase.google.com/) project
- Node.js and npm

## Step 1: Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project (or use an existing one).
2. Add a **Web** app and copy the config values.

## Step 2: Enable Firestore

1. In the project, open **Build → Firestore Database**.
2. Create database → **Start in production mode** (you will replace rules) or test mode for quick dev.
3. Publish rules from this repo: copy `firestore.rules` into **Firestore → Rules** → **Publish** (or use Firebase CLI: `firebase deploy --only firestore:rules`).

## Step 3: Environment variables

1. Create `.env` or `.env.local` in the project root.
2. Set the variables from `.env.example` (at minimum `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`; others have sensible defaults in code).

Restart `npm run dev` after any change to `.env`.

## Step 4: Run the app

```bash
npm install
npm run dev
```

Sign up with a **10–15 digit** mobile number and a password (min 4 characters). Optional admin: set `VITE_ADMIN_USERNAME` and `VITE_ADMIN_PASSWORD` for `/admin`.

## Troubleshooting

- **Permission denied**: Rules not published or too strict — use `firestore.rules` from this repo for development.
- **Database not configured**: Missing Firebase keys or dev server not restarted after editing `.env`.
