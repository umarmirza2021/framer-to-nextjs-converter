FRAMER TO NEXT.JS CONVERTER
===========================

APP LOCATION
------------
This folder on your Desktop:
  C:\Users\Umar_\Desktop\Framer to Next.js Converter

Original dev copy (same code):
  C:\Users\Umar_\framer-to-nextjs


LOCAL USE (your computer)
-------------------------
Double-click: Framer to Next.js Converter.lnk
Or run: Start Converter.bat
Opens at http://localhost:3847


DEPLOY ONLINE (Netlify - recommended)
-------------------------------------
1. Create a free GitHub account at https://github.com
2. Create a new repository (e.g. "framer-to-nextjs-converter")
3. Open terminal in THIS folder and run:

   git init
   git add .
   git commit -m "Framer to Next.js converter"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/framer-to-nextjs-converter.git
   git push -u origin main

4. Go to https://app.netlify.com → Add new site → Import from Git
5. Select your GitHub repo
6. Build settings (auto-detected):
   - Build command: npm run build
   - Netlify will use netlify.toml automatically
7. Click Deploy

Your converter will be live at: https://your-site-name.netlify.app


DEPLOY ONLINE (Vercel - also great for Next.js)
-----------------------------------------------
1. Push code to GitHub (steps above)
2. Go to https://vercel.com → Add New Project
3. Import your GitHub repo
4. Click Deploy (vercel.json is already included)

Live at: https://your-project.vercel.app


WHAT TO UPLOAD / PUSH
---------------------
Push the SOURCE files only (git handles this):
  app/, components/, lib/, package.json, netlify.toml, etc.

Do NOT upload node_modules/ or .next/ (they are in .gitignore)


CONVERT & DEPLOY OUTPUT
-----------------------
When users convert a Framer site, they download a .zip containing
a complete Next.js project they can deploy separately to Vercel/Netlify.