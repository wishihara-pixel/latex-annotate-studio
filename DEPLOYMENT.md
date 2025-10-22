# 🚀 Deploy to Vercel

This LaTeX Annotator app is ready to deploy to Vercel!

## 📋 Prerequisites

1. GitHub/GitLab/Bitbucket account (for repository)
2. Vercel account (free tier works great!)

## 🔧 Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Go to [Vercel](https://vercel.com)**
   - Sign in with your GitHub account
   - Click "Add New Project"
   - Import your repository

3. **Configure the project:**
   - Framework Preset: **Vite**
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Click "Deploy"

4. **Done!** 🎉
   - Your app will be live at: `https://your-project.vercel.app`
   - Vercel auto-deploys on every push to main

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## 🌐 Your App Features

✅ **Fully Static:** No server needed, perfect for Vercel  
✅ **Fast Loading:** Optimized Vite build  
✅ **Client-side Storage:** Uses localStorage, no database needed  
✅ **Auto-deploys:** Every git push triggers a new deployment  

## 🔒 Environment Variables

This app doesn't require any environment variables - it's 100% client-side!

## 📊 Performance

- Build time: ~3 seconds
- Bundle size: ~634 KB (196 KB gzipped)
- Includes KaTeX fonts for beautiful math rendering

## 🛠️ Custom Domain (Optional)

Once deployed, you can add a custom domain in Vercel:
1. Go to your project settings
2. Click "Domains"
3. Add your custom domain

## 🐛 Troubleshooting

**Issue:** 404 on page refresh  
**Solution:** Already configured! The `vercel.json` handles SPA routing.

**Issue:** Build fails  
**Solution:** Make sure all files are committed and `npm run build` works locally.

---

## 🎯 Quick Deploy

If your code is already on GitHub, just go to:
👉 https://vercel.com/new

And import your repository!

