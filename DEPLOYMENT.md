# Deployment Guide

## Deploy to Vercel via GitHub

### Steps:

1. **Create a GitHub repository**
   - Go to https://github.com/new
   - Create a new repository (public or private)
   - Don't initialize with README (we already have files)

2. **Push this project to GitHub**
   ```bash
   cd /Users/yuggothwal/Downloads/design_handoff_phishing_classification_console
   git init
   git add .
   git commit -m "Initial commit: Phishing Classification Console"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

3. **Deploy to Vercel**
   - Go to https://vercel.com
   - Sign in with GitHub
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect settings (no configuration needed!)
   - Click "Deploy"

4. **Done!**
   - Your site will be live at: `https://your-project-name.vercel.app`
   - Every push to `main` branch will auto-deploy

### Configuration Files Included:

- ✅ `vercel.json` - Vercel configuration
- ✅ `index.html` - Entry point (Vercel serves this by default)
- ✅ `.gitignore` - Excludes unnecessary files

### Notes:

- This is a static site (no build step needed)
- All files are served as-is
- The app works entirely client-side
- No environment variables or secrets required
