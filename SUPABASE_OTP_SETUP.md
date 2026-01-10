# Fix: Supabase Sending Magic Link Instead of OTP

## Problem
Supabase is sending a magic link (redirect URL) instead of an OTP code.

## Solution 1: Update Supabase Email Template

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/tliaxvmkdhtoacpkpgqr
2. Go to **Authentication** → **Email Templates**
3. Click on **"Magic Link"** template
4. Make sure the email body uses `{{ .Token }}` (not `{{ .ConfirmationURL }}`)

The template should look like this:

**Subject:**
```
Your OTP for Initra Home inventroymanagement app by issac
```

**Body (Source tab):**
```html
<h2>Initra Home inventroymanagement app by issac</h2>

<p>Your OTP code is:</p>

<h1 style="font-size: 32px; color: #3b82f6; letter-spacing: 8px; text-align: center; padding: 20px; background: #f3f4f6; border-radius: 8px; margin: 20px 0;">
  {{ .Token }}
</h1>

<p>Enter this code to verify your email address and complete your login.</p>

<p><strong>This code will expire in 1 hour.</strong></p>

<p>If you didn't request this code, please ignore this email.</p>
```

**Important:** Use `{{ .Token }}` NOT `{{ .ConfirmationURL }}`

## Solution 2: Check Supabase Auth Settings

1. Go to **Authentication** → **Settings**
2. Under **"Email Auth"**, make sure:
   - "Enable email signup" is ON
   - "Enable email confirmations" can be ON or OFF (doesn't matter for OTP)
3. Under **"Auth Providers"**, make sure **Email** is enabled

## Solution 3: Code Update (Already Done)

The code has been updated to remove `emailRedirectTo`, which forces Supabase to send OTP codes instead of magic links.

## Test

1. Restart your dev server
2. Try sending OTP again
3. Check your email - you should now receive a 6-digit code instead of a link

