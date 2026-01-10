# Simple Authentication Setup Guide

## ✅ What's Been Done

1. **Simple Auth System Created** - Mobile number + password (no email confirmation)
2. **Hardcoded Admin** - Username: `issac`, Password: `antonio`
3. **Admin Panel** - View all users and their passwords
4. **Updated Login Page** - Now uses mobile number instead of email
5. **Database Updated** - Uses mobile numbers for user isolation

## 📋 Next Steps

### Step 1: Create Database Table

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/tliaxvmkdhtoacpkpgqr
2. Go to **SQL Editor**
3. Copy and paste the contents of `simple-auth-schema.sql`
4. Click **Run**

This will create:
- `app_users` table (stores mobile + password in plaintext)
- Add `user_mobile` columns to `products` and `warranty_documents` tables

### Step 2: Test the System

1. **Restart your dev server**:
   ```bash
   npm run dev
   ```

2. **Test Regular User Signup**:
   - Go to login page
   - Click "Sign up here"
   - Enter mobile number (e.g., `1234567890`)
   - Enter password (min 4 characters)
   - Click "Sign Up"
   - Should log you in immediately

3. **Test Admin Login**:
   - Go to login page
   - Enter mobile/username: `issac`
   - Enter password: `antonio`
   - Click "Login"
   - Should redirect to `/admin` page

4. **Test Admin Panel**:
   - You should see all users listed
   - You can see their passwords (plaintext)
   - You can copy passwords to clipboard

## 🔑 Admin Credentials

- **Username/Mobile**: `issac`
- **Password**: `antonio`

## 📱 How It Works

- **Regular Users**: Sign up with mobile number + password
- **Admin**: Login with `issac` / `antonio` to access admin panel
- **User Isolation**: Each user only sees their own products (filtered by mobile number)
- **Password Storage**: Passwords stored in plaintext (as requested)
- **No Email Confirmation**: Users can login immediately after signup

## 🎯 Features

✅ Mobile number + password authentication
✅ Hardcoded admin account
✅ Admin panel to view all users and passwords
✅ User-specific data isolation
✅ No email confirmation needed
✅ Simple and straightforward

## 🐛 Troubleshooting

### "User not authenticated" error
- Make sure you're logged in
- Check browser localStorage for `currentUser`

### Can't see products
- Make sure `user_mobile` column exists in `products` table
- Run the SQL schema from `simple-auth-schema.sql`

### Admin login not working
- Make sure you're using exactly: `issac` and `antonio` (case-sensitive for password)

