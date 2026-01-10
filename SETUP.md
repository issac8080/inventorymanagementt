# Setup Guide - Authentication & Database

This guide will help you set up Supabase authentication and database for the Initra Home inventroymanagement app by issac.

## Prerequisites

- A Supabase account (free tier available at https://supabase.com)
- Node.js and npm installed

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: Initra Home Inventory (or any name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup (2-3 minutes)

## Step 2: Set Up Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click "Run" (or press Ctrl+Enter)
5. You should see "Success. No rows returned"

## Step 3: Get API Credentials

1. Go to **Settings** → **API** (left sidebar)
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the project root (if it doesn't exist)
2. Add the following:

```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace `your-project-url-here` and `your-anon-key-here` with the values from Step 3.

## Step 5: Configure Email Template

1. Go to **Authentication** → **Email Templates** (left sidebar)
2. Click on **"Magic Link"** template
3. Update the subject to: `Your OTP for Initra Home inventroymanagement app by issac`
4. Update the email body to include: `Initra Home inventroymanagement app by issac`
5. Click "Save"

## Step 6: Install Dependencies

The Supabase dependency should already be installed, but if not:

```bash
npm install @supabase/supabase-js
```

## Step 7: Test the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page
3. Enter your email address
4. Check your email for the OTP code
5. Enter the OTP
6. Set your username and password
7. You should now be logged in!

## Features Implemented

✅ **Email + OTP Authentication**: Users login with email and receive OTP
✅ **Username/Password Setup**: After OTP verification, users set username and password
✅ **User-Specific Data**: Each user can only see their own products and warranties
✅ **Cross-Device Access**: Data syncs across all devices when logged in
✅ **PostgreSQL Database**: Using Supabase (PostgreSQL-based, not MySQL/MongoDB)
✅ **Branding**: "Initra Home inventroymanagement app by issac" throughout the app

## Troubleshooting

### "Database not configured" error
- Make sure `.env.local` exists and has correct values
- Restart the dev server after creating `.env.local`

### OTP not received
- Check spam folder
- Verify email in Supabase dashboard
- Check Supabase project email settings

### Can't see my data
- Make sure you're logged in with the same account
- Check browser console for errors
- Verify Row Level Security policies are set up correctly

### Database errors
- Verify the SQL schema was run successfully
- Check Supabase dashboard → Database → Tables to see if tables exist
- Check Supabase dashboard → Authentication → Policies to see if RLS policies exist

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- The anon key is safe to use in the frontend (it's public)
- Never commit `.env.local` to git (it's already in `.gitignore`)

