# Deployment Guide - Vercel

## Quick Deploy (Recommended)

### Option 1: GitHub Integration (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your repository: `issac8080/Inventorymanagement`
4. Vercel will auto-detect the settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click "Deploy"
6. Your app will be live at `https://your-project-name.vercel.app`

### Option 2: Vercel CLI

1. Login to Vercel:
   ```bash
   vercel login
   ```

2. Deploy from your project directory:
   ```bash
   vercel
   ```

3. For production deployment:
   ```bash
   vercel --prod
   ```

## Configuration

The project includes `vercel.json` with:
- ✅ SPA routing (all routes serve index.html)
- ✅ PWA service worker caching
- ✅ Security headers
- ✅ Build and output directory settings

## Environment Variables

If you need any environment variables:
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add your variables

## Automatic Deployments

Once connected via GitHub:
- Every push to `main` branch = Production deployment
- Every push to other branches = Preview deployment
- Pull requests = Preview deployment with unique URL

## Build Settings

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x (auto-detected)
- **Install Command**: `npm install`

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

### Routing Issues
- The `vercel.json` includes rewrites for SPA routing
- All routes should work correctly

### PWA Not Working
- Ensure HTTPS (Vercel provides this automatically)
- Check service worker registration in browser console
- Verify manifest.json is accessible

## Next Steps

After deployment:
1. ✅ Your app is live!
2. 🔗 Share your Vercel URL
3. 📱 Test PWA installation on mobile
4. 🔄 Future pushes auto-deploy

