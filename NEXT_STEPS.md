# Next Steps - Complete Setup

## ✅ Step 1: Database Schema (DONE)
You've successfully run the SQL schema! Your database tables are now created.

## 📧 Step 2: Update Email Template

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/tliaxvmkdhtoacpkpgqr
2. Click on **Authentication** in the left sidebar
3. Click on **Email Templates**
4. Click on **"Magic Link"** template (this is used for OTP)
5. Update the template:

### Subject:
```
Your OTP for Initra Home inventroymanagement app by issac
```

### Email Body:
You can customize it, but make sure to include:
- "Initra Home inventroymanagement app by issac" branding
- The OTP code: `{{ .Token }}`
- A friendly message

Example:
```
Welcome to Initra Home inventroymanagement app by issac!

Your OTP code is: {{ .Token }}

This code will expire in 1 hour.

If you didn't request this code, please ignore this email.
```

6. Click **Save**

## 🧪 Step 3: Test the Application

1. **Start your dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open your browser** and go to the login page

3. **Test the OTP flow**:
   - Enter your email address
   - Click "Send OTP"
   - Check your email for the OTP code
   - Enter the OTP code
   - Set your username and password
   - You should be logged in!

4. **Test login with password**:
   - Logout
   - Click "Already have password? Login here"
   - Enter your email and password
   - You should be logged in!

5. **Test adding a product**:
   - Go to "Add Product"
   - Add a test product
   - Check if it saves correctly

## ✅ Step 4: Verify Everything Works

- [ ] Can send OTP email
- [ ] Can verify OTP
- [ ] Can set username/password
- [ ] Can login with email/password
- [ ] Can add products
- [ ] Can see only your own products (user isolation)
- [ ] Logo appears on all pages
- [ ] Branding text is correct

## 🎉 You're Done!

Your app is now fully set up with:
- ✅ Supabase database (PostgreSQL)
- ✅ Email + OTP authentication
- ✅ User-specific data isolation
- ✅ Cross-device sync
- ✅ Logo and branding

## 🐛 Troubleshooting

### OTP not received?
- Check spam folder
- Verify email in Supabase → Authentication → Users
- Check Supabase project email settings

### Can't login?
- Check browser console for errors
- Verify `.env.local` file has correct values
- Restart dev server after creating `.env.local`

### Database errors?
- Verify tables exist: Supabase → Database → Tables
- Check RLS policies: Supabase → Authentication → Policies
- Verify you're logged in (check auth state)

### Logo not showing?
- Verify `/initr.png` exists in `public` folder
- Check browser console for 404 errors
- Clear browser cache

