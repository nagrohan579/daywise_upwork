# Complete Deployment Guide for DayWise

## 📋 Overview

This guide will help you deploy:
- **Frontend** → Vercel (Static hosting with CDN)
- **Backend + Convex** → DigitalOcean Droplet (Always-on Node.js server)

## ⚠️ Issues Found & Fixed

### Hardcoded URLs Fixed:
1. ✅ `backend/index.ts` - CORS configuration now uses `FRONTEND_URL` env variable
2. ✅ `backend/lib/google-calendar.ts` - Google Calendar redirect URI now uses `BASE_URL`
3. ✅ `frontend/src/pages/Verify/Verify.tsx` - Now uses `VITE_API_URL`
4. ✅ `backend/routes.ts` - Stripe checkout URLs now use `FRONTEND_URL`

### Remaining Localhost References (Safe - Have Fallbacks):
- All frontend API calls already check `import.meta.env.VITE_API_URL` first
- Backend routes check `process.env.FRONTEND_URL` and `process.env.BASE_URL` first
- Localhost is only used as fallback for local development

---

## 🚀 Part 1: DigitalOcean Droplet Setup (Backend + Convex)

### Step 1: Create a DigitalOcean Droplet

1. Go to [DigitalOcean](https://www.digitalocean.com/)
2. Create a new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($6/month is sufficient to start)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or password
   - **Hostname**: `daywise-backend`

3. Note down your Droplet's **Public IP Address** (e.g., `123.456.789.012`)

### Step 2: Initial Server Setup

SSH into your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Update system packages:
```bash
apt update && apt upgrade -y
```

Install Node.js 20.x (LTS):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
```

Verify installation:
```bash
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x
```

Install PM2 (Process Manager):
```bash
npm install -g pm2
```

Install Nginx (Reverse Proxy):
```bash
apt install -y nginx
```

### Step 3: Clone and Setup Your Application

Clone your repository:
```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/daywise-app.git
cd daywise-app
```

Install all dependencies:
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install Convex CLI globally
npm install -g convex
```

### Step 4: Configure Environment Variables

Create backend `.env` file:
```bash
cd /var/www/daywise-app/backend
nano .env
```

Add the following (replace with your actual values):
```bash
# ============================================
# DEPLOYMENT URLS
# ============================================
FRONTEND_URL=https://your-app.vercel.app
BASE_URL=http://YOUR_DROPLET_IP:3000

# Port for the backend server
PORT=3000

# Node environment
NODE_ENV=production

# ============================================
# CONVEX DATABASE
# ============================================
CONVEX_DEPLOYMENT=prod:your-deployment-name
CONVEX_URL=https://your-deployment.convex.cloud

# ============================================
# SESSION & SECURITY
# ============================================
# Generate with: openssl rand -base64 32
SESSION_SECRET=GENERATE_A_RANDOM_32_CHARACTER_STRING

# ============================================
# GOOGLE OAUTH & CALENDAR
# ============================================
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# ============================================
# STRIPE PAYMENTS
# ============================================
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# ============================================
# EMAIL (SENDGRID)
# ============================================
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# ============================================
# ADMIN AUTHENTICATION
# ============================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHOOSE_A_SECURE_PASSWORD
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### Step 5: Deploy Convex Database

```bash
cd /var/www/daywise-app
convex deploy --prod
```

This will give you:
- `CONVEX_DEPLOYMENT` (e.g., `prod:daywise-xyz`)
- `CONVEX_URL` (e.g., `https://happy-monkey-123.convex.cloud`)

Update your backend `.env` with these values.

### Step 6: Build and Start Backend

```bash
cd /var/www/daywise-app/backend
npm run build
```

Start with PM2 (runs in background):
```bash
pm2 start dist/index.js --name daywise-backend
pm2 save
pm2 startup  # Follow the command it gives you
```

Check if running:
```bash
pm2 status
pm2 logs daywise-backend  # View logs
```

Test the backend:
```bash
curl http://localhost:3000/api/ping
# Should return: {"message":"pong"}
```

### Step 7: Configure Nginx Reverse Proxy

Create Nginx configuration:
```bash
nano /etc/nginx/sites-available/daywise
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_DROPLET_IP;

    # Increase body size for file uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/daywise /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl restart nginx
```

Test from your local machine:
```bash
curl http://YOUR_DROPLET_IP/api/ping
```

### Step 8: (Optional) Setup Domain and SSL

If you have a domain (e.g., `api.yourdomain.com`):

1. Add an A record in your DNS:
   - **Type**: A
   - **Name**: api (or @)
   - **Value**: YOUR_DROPLET_IP

2. Install Certbot for free SSL:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.yourdomain.com
```

3. Update backend `.env`:
```bash
BASE_URL=https://api.yourdomain.com
```

4. Restart backend:
```bash
pm2 restart daywise-backend
```

---

## 🌐 Part 2: Vercel Deployment (Frontend)

### Step 1: Update Google OAuth Settings

Go to [Google Cloud Console](https://console.cloud.google.com/):

1. Navigate to **APIs & Services** → **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add **Authorized redirect URIs**:
   - `http://YOUR_DROPLET_IP:3000/api/auth/google/callback`
   - `http://YOUR_DROPLET_IP:3000/api/google-calendar/callback`
   - If using domain: `https://api.yourdomain.com/api/auth/google/callback`
   - If using domain: `https://api.yourdomain.com/api/google-calendar/callback`

### Step 2: Push Code to GitHub

```bash
cd /Users/rohannag/Programs/Freelance/Upwork/DayWise\ application/daywise-app
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"New Project"**
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Environment Variables** - Add these:

```bash
VITE_API_URL=http://YOUR_DROPLET_IP
# OR if using domain:
VITE_API_URL=https://api.yourdomain.com

VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

```bash
# Optional but recommended: frontend public base URL used by the app when building
# shareable links (e.g. the "My Link" copy button). Set this to your Vercel URL
# so copied booking links point at your production site instead of localhost.
VITE_FRONTEND_URL=https://your-app.vercel.app
```

6. Click **"Deploy"**

7. Wait for deployment to complete (2-3 minutes)

8. Note your Vercel URL (e.g., `https://daywise-app.vercel.app`)

### Step 4: Update Backend with Vercel URL

SSH back into your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Update backend `.env`:
```bash
cd /var/www/daywise-app/backend
nano .env
```

Update this line:
```bash
FRONTEND_URL=https://daywise-app.vercel.app  # Your actual Vercel URL
```

Restart backend:
```bash
pm2 restart daywise-backend
```

Note: Also make sure you've added `VITE_FRONTEND_URL` in your Vercel project environment
variables (see Part 2) and set it to the same Vercel URL. This ensures client-side
features that build absolute public links (for example the "My Link" copy button)
use the production frontend domain instead of localhost.

### Step 5: Test the Full Stack

1. Visit your Vercel URL: `https://daywise-app.vercel.app`
2. Try to sign up / log in
3. Check that all API calls work
4. Test booking creation
5. Verify Google OAuth works

---

## 🔧 Environment Variables Summary

### Backend (DigitalOcean Droplet)

Create `/var/www/daywise-app/backend/.env`:

| Variable | Example | Description |
|----------|---------|-------------|
| `FRONTEND_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `BASE_URL` | `https://api.yourdomain.com` | Your droplet URL (IP or domain) |
| `PORT` | `3000` | Backend server port |
| `NODE_ENV` | `production` | Environment mode |
| `CONVEX_URL` | `https://happy-monkey-123.convex.cloud` | From `convex deploy` |
| `SESSION_SECRET` | Generated string | Random 32-char string |
| `GOOGLE_CLIENT_ID` | From Google Console | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | From Google Console | OAuth client secret |
| `STRIPE_SECRET_KEY` | From Stripe Dashboard | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard | Webhook secret |
| `SENDGRID_API_KEY` | From SendGrid | Email API key |
| `SENDGRID_FROM_EMAIL` | `noreply@yourdomain.com` | Sender email |

### Frontend (Vercel Dashboard)

Add in **Vercel** → **Your Project** → **Settings** → **Environment Variables**:

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `https://api.yourdomain.com` | Your backend URL |
| `VITE_CONVEX_URL` | `https://happy-monkey-123.convex.cloud` | Convex deployment URL |
| `VITE_GOOGLE_CLIENT_ID` | From Google Console | OAuth client ID |
| `VITE_FRONTEND_URL` | `https://your-app.vercel.app` | Public frontend URL used for shareable links |

---

## 🔄 Managing Your Deployment

### Backend Commands

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# View logs
pm2 logs daywise-backend

# Restart backend
pm2 restart daywise-backend

# Stop backend
pm2 stop daywise-backend

# View status
pm2 status

# Update code
cd /var/www/daywise-app
git pull origin main
cd backend
npm install
npm run build
pm2 restart daywise-backend
```

### Frontend Updates

Just push to GitHub:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Vercel will automatically redeploy.

### Convex Updates

```bash
cd /var/www/daywise-app
convex deploy --prod
```

---

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Use strong `SESSION_SECRET` (32+ characters)
- [ ] Setup SSL/HTTPS with Let's Encrypt
- [ ] Update Google OAuth redirect URIs
- [ ] Use Stripe live keys (not test keys)
- [ ] Setup firewall: `ufw allow 80,443,22/tcp`
- [ ] Regular backups of Convex data
- [ ] Monitor PM2 logs regularly

---

## 🆘 Troubleshooting

### Backend won't start
```bash
pm2 logs daywise-backend  # Check error logs
pm2 restart daywise-backend
```

### Frontend can't connect to backend
1. Check `VITE_API_URL` in Vercel
2. Check CORS settings in `backend/index.ts`
3. Verify `FRONTEND_URL` in backend `.env`

### Google OAuth not working
1. Verify redirect URIs in Google Console
2. Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
3. Ensure `BASE_URL` is correct in backend `.env`

### PM2 Process Keeps Dying
```bash
pm2 logs daywise-backend --lines 100  # View detailed logs
pm2 restart daywise-backend
```

---

## 📝 Quick Reference

| Service | URL Format | Example |
|---------|------------|---------|
| Frontend | `https://your-app.vercel.app` | Vercel deployment |
| Backend | `http://YOUR_IP` or `https://api.domain.com` | DigitalOcean droplet |
| Convex | `https://xxxx.convex.cloud` | Auto-generated |
| Admin Panel | `https://your-app.vercel.app/admin/login` | Frontend route |

---

## 🎯 Post-Deployment

After successful deployment:

1. ✅ Test user registration
2. ✅ Test Google OAuth login
3. ✅ Test booking creation
4. ✅ Test Stripe checkout
5. ✅ Test email notifications
6. ✅ Test Google Calendar integration
7. ✅ Monitor server logs for 24 hours
8. ✅ Setup monitoring (optional): [UptimeRobot](https://uptimerobot.com/)

---

**Need help?** Check the logs:
- Frontend: Vercel Dashboard → Your Project → Deployments → Logs
- Backend: `pm2 logs daywise-backend`
- Convex: Dashboard at https://dashboard.convex.dev

