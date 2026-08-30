# 🌐 Web Deployment Guide

This `dist/` folder is a **100% standalone, zero-build-step production bundle**. You can upload its contents directly to any web server or static hosting platform.

---

## ⚡ Option 1: Drag-and-Drop Static Hosts (Free & Easiest)

### A. Netlify / Vercel / Cloudflare Pages
1. Go to [Netlify Drop](https://app.netlify.com/drop) or [Cloudflare Pages](https://pages.cloudflare.com/).
2. Drag and drop this entire `dist` folder onto the web page.
3. Your site is live immediately with free HTTPS (which enables WebXR in VR out of the box)!

### B. GitHub Pages
1. Create a repository on GitHub (e.g. `vr-glb-viewer`).
2. Upload the contents of this `dist` folder to the repository or to a `gh-pages` branch.
3. In **Settings** → **Pages**, select your branch and click **Save**.
4. Check **"Enforce HTTPS"** under GitHub Pages settings.

---

## 🏢 Option 2: Traditional Web Servers (Apache / cPanel / Nginx)

### A. Apache / cPanel / Shared Hosting
- Upload all files from this `dist` folder into your `public_html` or website root directory.
- The included `.htaccess` file automatically configures `.glb` MIME types and CORS.
- **Important**: Ensure your domain has an active SSL certificate (Let's Encrypt / HTTPS) so VR headsets can activate WebXR.

### B. Nginx / VPS (Ubuntu, Debian, CentOS)
- Copy this `dist` folder to your server (e.g. `/var/www/vr-glb-viewer`).
- Refer to `nginx.conf` in this folder for the recommended MIME types and CORS settings.

---

## 📁 Adding Your Default 3D Model

To have your model load automatically when anyone visits your website:
1. Place your `.glb` file inside this `dist` folder (or inside `dist/models/`).
2. Name it `model.glb` or `default.glb`.
3. Alternatively, upload any named model (e.g. `building.glb`) and link to it with:
   `https://your-website.com/?model=building.glb`

---

## 🥽 VR Headset Usage on Live Web

Once deployed to an HTTPS domain (e.g. `https://your-domain.com`):
1. Put on your Meta Quest / Apple Vision Pro / Pico headset.
2. Open the headset's built-in browser and go to `https://your-domain.com`.
3. Click **"ENTER VR"** to explore!
