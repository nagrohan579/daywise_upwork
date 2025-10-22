# Environment Variables Reference

## Quick Setup Guide

### 1. Get Your DigitalOcean Droplet IP
After creating your droplet, note the **Public IP Address**: `123.456.789.012`

### 2. Deploy Convex First
```bash
cd /var/www/daywise-app
convex deploy --prod
```
This gives you:
- **CONVEX_URL**: `https://happy-monkey-123.convex.cloud`

### 3. Deploy Backend to DigitalOcean
Use the IP from step 1 and Convex URL from step 2.

### 4. Deploy Frontend to Vercel
Use the backend URL (your droplet IP) and Convex URL.

---

## Environment Variable Mapping

### 🔹 Backend (.env file on DigitalOcean)

```bash
# CRITICAL: Frontend URL (will be your Vercel URL after frontend deployment)
# Initially set to placeholder, update after Vercel deployment
FRONTEND_URL=https://daywise-app.vercel.app

# CRITICAL: Your DigitalOcean droplet URL  
# Use PUBLIC IP initially, can change to domain later
BASE_URL=http://123.456.789.012
# Or with domain: BASE_URL=https://api.yourdomain.com

# Server Configuration
PORT=3000
NODE_ENV=production

# Database (from convex deploy)
CONVEX_URL=https://happy-monkey-123.convex.cloud

# Security (generate random string)
SESSION_SECRET=<random-32-chars>

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx

# Stripe (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# SendGrid (from SendGrid)
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### 🔹 Frontend (Vercel Environment Variables)

Add these in **Vercel Dashboard** → **Settings** → **Environment Variables**:

```bash
# Backend URL (your DigitalOcean droplet)
VITE_API_URL=http://123.456.789.012
# Or with domain: VITE_API_URL=https://api.yourdomain.com

# Convex URL (same as backend)
VITE_CONVEX_URL=https://happy-monkey-123.convex.cloud

# Google Client ID (same as backend)
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

---

## URL Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER'S BROWSER                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ visits
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Vercel)                                               │
│  https://daywise-app.vercel.app                                  │
│                                                                   │
│  Environment Variables:                                          │
│  - VITE_API_URL=http://YOUR_DROPLET_IP                          │
│  - VITE_CONVEX_URL=https://xxxx.convex.cloud                    │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    │ API calls                 │ Real-time data
                    ▼                           ▼
┌──────────────────────────────┐  ┌───────────────────────────────┐
│ BACKEND (DigitalOcean)       │  │ CONVEX (Hosted by Convex)     │
│ http://YOUR_DROPLET_IP:3000  │  │ https://xxxx.convex.cloud     │
│                               │  │                               │
│ Environment Variables:        │  │ Accessed via CONVEX_URL       │
│ - FRONTEND_URL (Vercel URL)  │  │                               │
│ - BASE_URL (This server)     │  │ - Users table                 │
│ - CONVEX_URL                 │  │ - Bookings table              │
│ - GOOGLE_CLIENT_*            │  │ - Appointments table          │
│ - STRIPE_*                   │  │ - etc...                      │
│ - SENDGRID_*                 │  │                               │
└──────────────────────────────┘  └───────────────────────────────┘
```

---

## Critical URL Relationships

### 1. **CORS Configuration** (backend/index.ts)
```javascript
origin: process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL.split(',')  // Your Vercel URL
  : ['http://localhost:5173']
```
**Purpose**: Allows frontend to make API calls to backend

---

### 2. **Frontend API Calls** (all frontend files)
```javascript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```
**Purpose**: Frontend knows where to send API requests

---

### 3. **Google OAuth Redirects** (backend/routes.ts)
```javascript
const redirectUri = `${process.env.BASE_URL}/api/auth/google/callback`;
```
**Purpose**: Google redirects back to your backend after OAuth

---

### 4. **Email Links** (backend/routes.ts)
```javascript
const verificationUrl = `${process.env.FRONTEND_URL}/verify/${token}`;
```
**Purpose**: Email verification links point to frontend

---

### 5. **Stripe Redirects** (backend/routes.ts)
```javascript
success_url: `${process.env.FRONTEND_URL}/billing?success=1`
cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=1`
```
**Purpose**: After payment, redirect to frontend

---

## Deployment Sequence

**IMPORTANT: Follow this order!**

### Step 1: Setup DigitalOcean Droplet
1. Create droplet
2. Note **PUBLIC IP**: `123.456.789.012`

### Step 2: Deploy Convex
```bash
convex deploy --prod
```
3. Note **CONVEX_URL**: `https://xxxx.convex.cloud`

### Step 3: Configure Backend .env
4. Create `/var/www/daywise-app/backend/.env`
5. Set `BASE_URL=http://123.456.789.012`
6. Set `CONVEX_URL=<from step 2>`
7. Set `FRONTEND_URL=https://temporary.vercel.app` (placeholder)
8. Add all other credentials (Google, Stripe, SendGrid)

### Step 4: Start Backend
```bash
cd /var/www/daywise-app/backend
npm run build
pm2 start dist/index.js --name daywise-backend
```

### Step 5: Deploy Frontend to Vercel
9. Set `VITE_API_URL=http://123.456.789.012`
10. Set `VITE_CONVEX_URL=<from step 2>`
11. Deploy and note **Vercel URL**: `https://daywise-app.vercel.app`

### Step 6: Update Backend with Vercel URL
12. SSH to droplet
13. Update `FRONTEND_URL=https://daywise-app.vercel.app`
14. Restart: `pm2 restart daywise-backend`

### Step 7: Update Google OAuth
15. Add redirect URIs in Google Console:
    - `http://123.456.789.012/api/auth/google/callback`
    - `http://123.456.789.012/api/google-calendar/callback`

**DONE!** ✅

---

## With Custom Domain (Optional)

If you want to use a custom domain like `api.yourdomain.com`:

### DNS Setup
1. Add A record: `api.yourdomain.com` → `123.456.789.012`
2. Wait for DNS propagation (up to 48 hours)

### SSL Setup
```bash
certbot --nginx -d api.yourdomain.com
```

### Update Environment Variables

**Backend .env:**
```bash
BASE_URL=https://api.yourdomain.com
```

**Vercel:**
```bash
VITE_API_URL=https://api.yourdomain.com
```

**Google Console:**
- `https://api.yourdomain.com/api/auth/google/callback`
- `https://api.yourdomain.com/api/google-calendar/callback`

**Restart:**
```bash
pm2 restart daywise-backend
```

Redeploy frontend on Vercel (push to GitHub).

---

## Testing Checklist

After deployment, verify each connection:

- [ ] Frontend loads: `https://your-app.vercel.app`
- [ ] Backend responds: `http://YOUR_IP/api/ping` returns `{"message":"pong"}`
- [ ] Convex connects: Check Network tab for successful API calls
- [ ] CORS works: No CORS errors in browser console
- [ ] Google OAuth works: Can log in with Google
- [ ] Stripe works: Can access checkout
- [ ] Emails work: Receive verification emails
- [ ] Sessions persist: Stay logged in after refresh

---

## Common Mistakes to Avoid

❌ **Using https:// for IP address without SSL**
```bash
BASE_URL=https://123.456.789.012  # WRONG - will fail
BASE_URL=http://123.456.789.012   # CORRECT
```

❌ **Forgetting to update Google OAuth redirect URIs**
Result: "redirect_uri_mismatch" error

❌ **Wrong Convex URL**
Result: Database connection fails

❌ **Missing trailing slash or extra slash**
```bash
VITE_API_URL=http://123.456.789.012/  # WRONG
VITE_API_URL=http://123.456.789.012   # CORRECT
```

❌ **Not restarting backend after env changes**
```bash
# After changing .env, ALWAYS:
pm2 restart daywise-backend
```

❌ **Not redeploying frontend after changing Vercel env vars**
Vercel env vars only take effect on new deployments!

---

## Quick Commands Reference

### Generate SESSION_SECRET
```bash
openssl rand -base64 32
```

### Test backend is running
```bash
curl http://YOUR_DROPLET_IP/api/ping
```

### View backend logs
```bash
pm2 logs daywise-backend
```

### Restart after env change
```bash
pm2 restart daywise-backend
```

### Check Nginx is running
```bash
systemctl status nginx
```

---

**Last Updated**: Follow the DEPLOYMENT_GUIDE.md for complete step-by-step instructions.

